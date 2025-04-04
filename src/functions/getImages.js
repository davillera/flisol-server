const { BlobServiceClient } = require("@azure/storage-blob");
const { app } = require("@azure/functions");

app.http("getImages", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (_, context) => {
    try {
      context.log("📢 Obteniendo lista de imágenes...");

      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
      if (!connectionString || !containerName) {
        return { status: 500, body: "Configuraciones de almacenamiento faltantes." };
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);

      let images = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        images.push(`${containerClient.url}/${blob.name}`);
      }

      return { status: 200, body: JSON.stringify({ images }) };
    } catch (error) {
      context.log.error("❌ Error al obtener imágenes:", error);
      return { status: 500, body: "Error en el servidor." };
    }
  },
});
