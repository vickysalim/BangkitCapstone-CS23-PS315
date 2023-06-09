import { Rank, Tensor, node } from "@tensorflow/tfjs-node";
import express from "express";
import { uploadMemory } from "../../../lib/multer";
import connection from "../../../config/db";
import { Storage } from "@google-cloud/storage";
import { uuidv4 } from "../../../lib/uuid";

// CREATE TABLE `FreshnessDataset` (
//   `id` varchar(255) NOT NULL,
//   `userId` varchar(255) DEFAULT NULL,
//   `productId` varchar(255) DEFAULT NULL,
//   `name` varchar(255) DEFAULT NULL,
//   `type` varchar(10) DEFAULT NULL,
//   `isFresh` tinyint(1) DEFAULT NULL,
//   `nutritionDesc` text DEFAULT NULL,
//   `pictureUrl` varchar(500) DEFAULT NULL
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

export async function predictFruitFreshness(img: Express.Multer.File) {
  const model = await node.loadSavedModel(process.cwd() + "/src/models/fruits/");
  const classes = ["fresh", "rotten"];

  // turn image into tensor
  const tensor = node.decodeImage(img.buffer);

  const image = tensor.resizeNearestNeighbor([256, 256]).expandDims(0);

  // turn to float
  const input = image.toFloat();

  const predictions: Tensor<Rank> = model.predict(input) as Tensor<Rank>;

  const predictionData = Array.from(await predictions.data()).map(
    (confidence) => {
      return {
        class: confidence > 0.6 ? classes[0] : classes[1],
        confidence: (confidence < 0.6 ? 1 - confidence : confidence) * 100,
      };
    },
  );

  const output = {
    success: true,
    message: "Prediction successful",
    predictions: predictionData[2],
  };

  return output;
}

const router = express.Router();

router.post("/", uploadMemory.any(), async (req, res) => {
  const { userId, productId, name } = req.body;
  const image = req.file;
  const type = "fruits";
  const id = uuidv4();

  const imageUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/uploads/${userId}/${id}.${image?.mimetype.split("/")[1]}`;

  const storage = new Storage().bucket(process.env.GCP_BUCKET_NAME as string);

  const blob = storage.file(`uploads/${userId}/${id}.${image?.mimetype.split("/")[1]}`);
  const blobStream = blob.createWriteStream();

  blobStream.on("error", (err) => {
    console.log(err);
  });

  blobStream.on("finish", () => {
    console.log("Image uploaded successfully");
  });

  blobStream.end(image?.buffer);

  const conn = await connection();
  const nutritionDesc = "This feature is not yet implemented. Please check back later!";
  const prediction = await predictFruitFreshness(image as Express.Multer.File);
  const isFresh = prediction.predictions.class === "fresh" ? 1 : 0;

  const sql = `
    INSERT INTO FreshnessDataset (id, userId, productId, name, type, isFresh, nutritionDesc, pictureUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `;

  await conn.execute(sql, [id, userId, productId ?? null, name, type, isFresh, nutritionDesc, imageUrl]);
  
  const getSql = `
    SELECT * FROM FreshnessDataset WHERE id = ?;
  `;

  const rows = await conn.execute(getSql, [id]);
  await conn.end();

  const data = rows[0];

  const output = {
    data,
    prediction,
  };

  res.status(200).json(output);
});

export default router;