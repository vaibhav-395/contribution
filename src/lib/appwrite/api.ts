import { ID, Query, ImageGravity } from "appwrite";

import { appwriteConfig, account, databases, storage, avatars } from "./config";
import { IUpdatePost, INewPost, INewUser, IUpdateUser } from "@/types";

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    return newUser;
  } catch (error) {
    console.error("Error creating user account:", error);
    throw error;
  }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  username?: string;
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      user
    );

    return newUser;
  } catch (error) {
    console.error("Error saving user to DB:", error);
    throw error;
  }
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createSession(user.email, user.password);
    return session;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    console.error("Error getting account:", error);
    throw error;
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser.documents.length) {
      throw new Error("User not found");
    }

    return currentUser.documents[0];
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  try {
    const uploadedFile = await uploadFile(post.file[0]);
    const fileUrl = getFilePreview(uploadedFile.$id);

    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageId: uploadedFile.$id,
        location: post.location,
        tags: tags,
      }
    );

    return newPost;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    return uploadedFile;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
  try {
    const fileUrl = storage.getFilePreview(
      appwriteConfig.storageId,
      fileId,
      2000,
      2000,
      ImageGravity.Top,
      100
    );

    return fileUrl;
  } catch (error) {
    console.error("Error getting file preview:", error);
    throw error;
  }
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);
    return { status: "ok" };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

// ============================== GET POSTS
export async function searchPosts(searchTerm: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.search("caption", searchTerm)]
    );

    return posts;
  } catch (error) {
    console.error("Error searching posts:", error);
    throw error;
  }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam.toString()));
  }

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    return posts;
  } catch (error) {
    console.error("Error getting infinite posts:", error);
    throw error;
  }
}

// ============================== GET POST BY ID
export async function getPostById(postId: string) {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    return post;
  } catch (error) {
    console.error("Error getting post by ID:", error);
    throw error;
  }
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let image = {
      imageUrl: post.imageUrl,
      imageId: post.imageId,
    };

    if (hasFileToUpdate) {
      const uploadedFile = await uploadFile(post.file[0]);
      const fileUrl = getFilePreview(uploadedFile.$id);
      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location,
        tags: tags,
      }
    );

    if (hasFileToUpdate) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
}

// ============================== DELETE POST
export async function deletePost(postId: string, imageId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    await deleteFile(imageId);

    return { status: "Ok" };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}

// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      }
    );

    return updatedPost;
  } catch (error) {
    console.error("Error liking post:", error);
    throw error;
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const savedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    return savedPost;
  } catch (error) {
    console.error("Error saving post:", error);
    throw error;
  }
}

// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    return { status: "Ok" };
  } catch (error) {
    console.error("Error deleting saved post:", error);
    throw error;
  }
}

// ============================== GET USER'S POSTS
export async function getUserPosts(userId: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    );

    return posts;
  } catch (error) {
    console.error("Error getting user posts:", error);
    throw error;
  }
}

// ============================== GET RECENT POSTS
export async function getRecentPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)]
    );

    return posts;
  } catch (error) {
    console.error("Error getting recent posts:", error);
    throw error;
  }
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries: any[] = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      queries
    );

    return users;
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      const uploadedFile = await uploadFile(user.file[0]);
      const fileUrl = getFilePreview(uploadedFile.$id);
      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      }
    );

    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}