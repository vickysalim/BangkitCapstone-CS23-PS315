package academy.bangkit.sifresh.data.response

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

@Parcelize
data class AddAddress(

    @field:SerializedName("address")
    val address: String,

    @field:SerializedName("province")
    val province: String,

    @field:SerializedName("city")
    val city: String,

    @field:SerializedName("kecamatan")
    val kecamatan: String,

    @field:SerializedName("kodePos")
    val kodePos: String,

    @field:SerializedName("id")
    val id: String
) : Parcelable
