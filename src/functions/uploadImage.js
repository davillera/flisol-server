const { BlobServiceClient } = require("@azure/storage-blob");
const { app } = require("@azure/functions");

app.http("uploadImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      context.log("📸 Recibiendo imagen...");

      const contentType = request.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        return { status: 400, body: "El Content-Type debe ser image/jpeg, image/png, etc." };
      }

      const fileExtension = contentType.split("/")[1];
      const arrayBuffer = await request.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
      if (!connectionString || !containerName) {
        return { status: 500, body: "Variables de entorno faltantes." };
      }

      const blobName = `${Date.now()}.${fileExtension}`;
      const imageUrl = await uploadToBlob(connectionString, containerName, blobName, imageBuffer, contentType);

      return {
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "✅ Imagen subida correctamente.", imageUrl }),
      };
    } catch (error) {
      context.log.error("❌ Error al subir imagen:", error);
      return { status: 500, body: "Error interno del servidor." };
    }
  },
});

async function uploadToBlob(connectionString, containerName, blobName, imageBuffer, contentType) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(imageBuffer, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  return blockBlobClient.url;
}