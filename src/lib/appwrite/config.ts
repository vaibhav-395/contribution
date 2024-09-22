import { Client, Account, Databases, Storage, Avatars } from "appwrite";

export const appwriteConfig = {
  projectId: 'your-project-id',
  endpoint: 'https://your-appwrite-endpoint.com/v1',
  databaseId: 'your-database-id',
  storageId: 'your-storage-id',
  userCollectionId: 'your-user-collection-id',
  postCollectionId: 'your-post-collection-id',
  savesCollectionId: 'your-saves-collection-id',
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);