import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME!;
const ACCOUNT_KEY = process.env.STORAGE_ACCOUNT_KEY!;
const CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING!;
const CONTAINER_NAME = process.env.BLOB_CONTAINER_PHOTOS ?? 'ticket-photos';

function getBlobServiceClient(): BlobServiceClient {
  return BlobServiceClient.fromConnectionString(CONNECTION_STRING);
}

export async function generateUploadSasUrl(ticketId: string, contentType: string): Promise<{ sasUrl: string; blobName: string }> {
  const extension = contentType.includes('png') ? 'png'
    : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : 'bin';

  const blobName = `${ticketId}/${uuidv4()}.${extension}`;

  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    await containerClient.createIfNotExists({ access: 'blob' });
    const blobClient = containerClient.getBlockBlobClient(blobName);
    return { sasUrl: blobClient.url, blobName };
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + 15);

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn: new Date(),
      expiresOn,
      contentType,
      protocol: SASProtocol.Https,
    },
    sharedKeyCredential
  );

  return {
    sasUrl: `https://${ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasQueryParams.toString()}`,
    blobName,
  };
}
