import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const storage = new Storage();
// Needs to be globally universal
const rawVideoBucketName = "";
const processedVideoBucketName = "";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

// Create the local directories for raw and processed videos
export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

/**
 * Process a raw video
 * @param rawVideoName
 * @param processedVideoName
 * @returns Promise that resolves when the video has been converted.
 */
export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360")
      .on("end", () => {
        console.log("Processing finished successfully");
        resolve();
      })
      .on("error", (err: any) => {
        console.log(`An error occurred: ${err.message}`);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

/**
 * Download raw video from its bucket.
 * @param fileName
 * @returns Promise that resolves when the file has been downloaded.
 */
export async function downloadRawVideo(fileName: string) {
  await storage
    .bucket(rawVideoBucketName)
    .file(fileName)
    .download({ destination: `${localRawVideoPath}/${fileName}` });

  console.log(
    `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
  );
}

/**
 *
 * @param fileName
 * @returns Promise that resolves when the file has been uploaded.
 */
export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);

  await storage
    .bucket(processedVideoBucketName)
    .upload(`${localProcessedVideoPath}/${fileName}`, {
      destination: fileName,
    });

  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
  );

  // Set the video to be publicly readable
  // TODO:: Allow user to decide to default to video being public or private by default
  await bucket.file(fileName).makePublic();
}

/**
 * Delete raw video
 * @param fileName
 */
export function deleteRawVideo(fileName: string) {
  return deleteFile(`${localRawVideoPath}/${fileName}`);
}

export function deleteProcessedVideo(fileName: string) {
  return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * Delete file
 * @param filePath
 * @returns Promise that resolves when the file has been deleted.
 */
function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Failed to delete file at ${filePath}`, err);
          reject(err);
        } else {
          console.log(`File deleted at ${filePath}`);
          resolve();
        }
      });
    } else {
      console.log(`File not found at ${filePath}, skipping delete.`);
      resolve();
    }
  });
}

/**
 * Ensures a directory exists, creating it if necessary.
 * @param dirPath - The directory path to check
 */
function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created at ${dirPath}`);
  }
}
