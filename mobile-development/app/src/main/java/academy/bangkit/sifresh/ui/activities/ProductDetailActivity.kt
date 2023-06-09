package academy.bangkit.sifresh.ui.activities

import academy.bangkit.sifresh.R
import academy.bangkit.sifresh.data.local.SettingPreferences
import academy.bangkit.sifresh.data.local.dataStore
import academy.bangkit.sifresh.databinding.ActivityProductDetailBinding
import academy.bangkit.sifresh.ui.viewmodels.CartViewModel
import academy.bangkit.sifresh.ui.viewmodels.SettingViewModel
import academy.bangkit.sifresh.ui.viewmodels.SettingViewModelFactory
import academy.bangkit.sifresh.utils.Helper
import academy.bangkit.sifresh.utils.ResponseCode
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.denzcoskun.imageslider.constants.ScaleTypes
import com.denzcoskun.imageslider.models.SlideModel

class ProductDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProductDetailBinding

    private lateinit var cartViewModel: CartViewModel

    private lateinit var productId: String
    private lateinit var sellerId: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProductDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        productId = intent.getStringExtra(EXTRA_PRODUCT_ID) ?: ""
        sellerId = intent.getStringExtra(EXTRA_PRODUCT_SELLER_ID) ?: ""

        cartViewModel = ViewModelProvider(this)[CartViewModel::class.java]

        setUserData()

        cartViewModel.userId.observe(this) {
            cartViewModel.getUserCartItemPerProduct(productId)
        }

        cartViewModel.cartItem.observe(this) {
            if (it != null) {
                binding.apply {
                    btnAddToCart.visibility = View.GONE
                    viewQuantityCount.visibility = View.VISIBLE
                    tvItemQuantity.text = it.amount.toString()
                }
            }
        }

        cartViewModel.updateStatus.observe(this) {
            when (it) {
                ResponseCode.LOADING -> {
                    binding.apply {
                        btnAddToCart.isEnabled = false
                        btnQuantityMin.isEnabled = false
                        btnQuantityPlus.isEnabled = false
                    }
                }
                ResponseCode.SUCCESS -> {
                    binding.apply {
                        Toast.makeText(
                            this@ProductDetailActivity,
                            getString(R.string.text_cart),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
            if (it != ResponseCode.LOADING) {
                binding.apply {
                    btnAddToCart.isEnabled = true
                    btnQuantityMin.isEnabled = true
                    btnQuantityPlus.isEnabled = true
                }
            }
        }

        binding.apply {
            tvProductName.text = intent.getStringExtra(EXTRA_PRODUCT_NAME)
            val imageList = ArrayList<SlideModel>()
            val imageUrlList =
                intent.getStringArrayListExtra(EXTRA_PRODUCT_IMAGE) ?: ArrayList<String>()
            for (image in imageUrlList) {
                imageList.add(SlideModel(image))
            }
            binding.imgBanner.setImageList(imageList, ScaleTypes.CENTER_CROP)
            tvProductPrice.text =
                Helper.formatCurrency(intent.getDoubleExtra(EXTRA_PRODUCT_PRICE, 0.0))
            tvDescription.text = intent.getStringExtra(EXTRA_PRODUCT_DESCRIPTION)
            tvSellerName.text = intent.getStringExtra(EXTRA_PRODUCT_SELLER_NAME)

            btnAddToCart.setOnClickListener {
                btnAddToCart.visibility = View.GONE
                viewQuantityCount.visibility = View.VISIBLE
                tvItemQuantity.text = "1"
                cartViewModel.addCartItem(sellerId, productId)
            }

            btnQuantityMin.setOnClickListener {
                setQuantityMin()
                if (viewQuantityCount.visibility == View.VISIBLE) {
                    Log.e("TAG", "onCreate: if")
                    cartViewModel.updateCartItem(productId, tvItemQuantity.text.toString().toInt())
                } else {
                    Log.e("TAG", "onCreate: else")
                    cartViewModel.deleteCartItem()
                }
            }

            btnQuantityPlus.setOnClickListener {
                setQuantityPlus()
                cartViewModel.updateCartItem(productId, tvItemQuantity.text.toString().toInt())
            }

            btnBack.setOnClickListener {
                finish()
            }
        }
    }

    private fun setQuantityMin() {
        binding.apply {
            val quantity = tvItemQuantity.text.toString().toInt()
            val newQuantity = quantity - 1
            if (newQuantity > 0) {
                tvItemQuantity.text = newQuantity.toString()
            } else {
                btnAddToCart.visibility = View.VISIBLE
                viewQuantityCount.visibility = View.GONE
            }
        }
    }

    private fun setQuantityPlus() {
        binding.apply {
            val quantity = tvItemQuantity.text.toString().toInt()
            val newQuantity = quantity + 1
            tvItemQuantity.text = newQuantity.toString()
        }
    }

    private fun setUserData() {
        val settingPreferences = SettingPreferences.getInstance(this.dataStore)
        val settingViewModel = ViewModelProvider(
            this,
            SettingViewModelFactory(settingPreferences)
        )[SettingViewModel::class.java]

        settingViewModel.getUserPreferences(SettingPreferences.Companion.UserPreferences.UserToken.name)
            .observe(this) { token ->
                if (token != "") cartViewModel.userToken.value = token
            }

        settingViewModel.getUserPreferences(SettingPreferences.Companion.UserPreferences.UserID.name)
            .observe(this) { id ->
                if (id != "") cartViewModel.userId.value = id
            }
    }

    companion object {
        const val EXTRA_PRODUCT_NAME = "extra_product_name"
        const val EXTRA_PRODUCT_IMAGE = "extra_product_image"
        const val EXTRA_PRODUCT_PRICE = "extra_product_price"
        const val EXTRA_PRODUCT_DESCRIPTION = "extra_product_description"
        const val EXTRA_PRODUCT_SELLER_NAME = "extra_product_seller_name"
        const val EXTRA_PRODUCT_SELLER_ID = "extra_product_seller_id"
        const val EXTRA_PRODUCT_ID = "extra_product_id"
    }
}