import express, { Request, Response } from "express";
import connection from "../../config/db";
import { uuidv4 } from "../../lib/uuid";
import { verifyToken } from "../../lib/helper";
import upload from "../../lib/multer";

const router = express.Router();

// Product schema:
// id: varchar(255) (UUIDv4 using uuidjs) (primary key)
// sellerId: varchar(255) (UUIDv4 using uuidjs) (foreign key to User.id)
// name: varchar(255)
// sellerName: varchar(100)
// type: varchar(10) (enum: ["vegetable", "fruit", "other"])
// price: int
// isAvailable: boolean
// description: text
// productPicUrls: varchar(255) (array of strings)
// publishedAt: date

async function addProduct(
  sellerId: string,
  name: string,
  sellerName: string,
  type: string,
  price: number,
  isAvailable: boolean,
  description: string,
  //  productPics: Express.Multer.File[],
  publishedAt: Date,
) {
  const conn = await connection();
  const id = uuidv4();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let productPicUrls: string[] = [];

  // for (let i = 0; i < productPics.length; i++) {
  //   const productPic = productPics[i];

  //   productPicUrls.push(
  //     `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/uploads/${productPic.filename}`,
  //   );
  // }

  const sql = `
    INSERT INTO Product (id, sellerId, name, sellerName, type, price, isAvailable, description, productPicUrls, publishedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const getProductByIdSql = `
    SELECT * FROM Product WHERE id = ?;
  `;

  await conn.execute(sql, [
    id,
    sellerId,
    name,
    sellerName,
    type,
    price,
    isAvailable,
    description,
    ["https://storage.googleapis.com/sifresh-bucket-one/uploads/default.png"],
    //    JSON.stringify(productPicUrls),
    publishedAt,
  ]);

  await conn.end();

  const rows = await conn.execute(getProductByIdSql, [id]);

  const product = rows[0 as keyof typeof rows];

  return product;
}

async function updateProduct(
  id: string,
  sellerId: string,
  name: string,
  sellerName: string,
  type: string,
  price: number,
  isAvailable: boolean,
  description: string,
  publishedAt: Date,
) {
  const conn = await connection();
  const sql = `
    UPDATE Product
    SET sellerId = ?, name = ?, sellerName = ?, type = ?, price = ?, isAvailable = ?, description = ?, publishedAt = ?
    WHERE id = ?;
  `;

  const getProductByIdSql = `
    SELECT * FROM Product WHERE id = ?;
  `;

  await conn.execute(sql, [
    sellerId,
    name,
    sellerName,
    type,
    price,
    isAvailable,
    description,
    publishedAt,
    id,
  ]);

  const rows = await conn.execute(getProductByIdSql, [id]);
  await conn.end();

  const product = rows[0 as keyof typeof rows];

  return product;
}

router.post("/", upload.array("productPics", 12), async (req: Request, res: Response) => {
  const {
    sellerId,
    name,
    sellerName,
    type,
    price,
    isAvailable,
    description,
    publishedAt,
  } = req.body;
  const authHeader = req.headers.authorization as string;

  const token = authHeader.split(" ")[1];

  const verifiedToken = await verifyToken(token);

  if (verifiedToken.code === "INVALID_TOKEN_ERROR") {
    res.status(403).json(verifiedToken);
    return;
  }

  //const productPics = req.files;

  if (verifiedToken.id !== sellerId) {
    res.status(403).json({
      code: "UNAUTHORIZED_ERROR",
      message: "Unauthorized",
    });
    return;
  }

  const product: any = await addProduct(
    sellerId as string,
    name as string,
    sellerName as string,
    type as string,
    Number(price),
    isAvailable === "true" ? true : false,
    description as string,
    //  productPics as Express.Multer.File[],
    new Date(publishedAt as string),
  );

  res.status(201).json({
    ...product,
    //productPicUrls: product.productPicUrls,
  });
});

router.post("/update", upload.none(), async (req: Request, res: Response) => {
  const {
    id,
    sellerId,
    name,
    sellerName,
    type,
    price,
    isAvailable,
    description,
    publishedAt,
  } = req.body;

  const authHeader = req.headers.authorization as string;

  const token = authHeader.split(" ")[1];

  const verifiedToken = await verifyToken(token);

  if (verifiedToken.code === "INVALID_TOKEN_ERROR") {
    res.status(403).json(verifiedToken);
    return;
  }


  if (verifiedToken.id !== sellerId) {
    res.status(403).json({
      code: "UNAUTHORIZED_ERROR",
      message: "Unauthorized",
    });
    return;
  }

  const product: any = await updateProduct(
    id as string,
    sellerId as string,
    name as string,
    sellerName as string,
    type as string,
    Number(price),
    isAvailable === "true" ? true : false,
    description as string,
    new Date(publishedAt as string),
  );

  res.status(201).json({
    ...product,
    productPicUrls: product.productPicUrls,
  });
});

export default router;
