const { BlobServiceClient } = require("@azure/storage-blob");
const { app } = require("@azure/functions");

app.http("uploadImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      context.log(`📢 Recibiendo imagen en: ${request.url}`);

      const { imageBuffer, fileExtension } = await extractImage(request);
      if (!imageBuffer) return { status: 400, body: "Debe subir una imagen válida." };

      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
      if (!connectionString || !containerName) {
        return { status: 500, body: "Configuraciones de almacenamiento faltantes." };
      }

      const blobName = `${Date.now()}.${fileExtension}`;
      const imageUrl = await uploadToBlob(connectionString, containerName, blobName, imageBuffer, fileExtension);

      return { status: 201, body: JSON.stringify({ message: "✅ Imagen subida correctamente.", imageUrl }) };
    } catch (error) {
      context.log.error("❌ Error al subir la imagen:", error);
      return { status: 500, body: "Error en el servidor." };
    }
  },
});

async function extractImage(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("image/") && !contentType.includes("multipart/form-data")) {
    return { imageBuffer: null };
  }

  if (contentType.startsWith("image/")) {
    return { imageBuffer: await request.arrayBuffer(), fileExtension: contentType.split("/")[1] };
  }

  const bodyText = await request.text();
  const match = bodyText.match(/Content-Type: image\/([a-z]+)/);
  const fileData = bodyText.split("\r\n\r\n")[1];

  if (!match || !fileData) return { imageBuffer: null };

  return { imageBuffer: Buffer.from(fileData.trim(), "binary"), fileExtension: match[1] };
}

async function uploadToBlob(connectionString, containerName, blobName, imageBuffer, fileExtension) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(Buffer.from(imageBuffer), { blobHTTPHeaders: { blobContentType: `image/${fileExtension}` } });

  return blockBlobClient.url;
}
