import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

const getAdminApp = () => {
  if (adminApp) {
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY deben estar configurados.'
    );
  }

  adminApp = admin.apps[0]
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

  return adminApp;
};

export const getAdminAuth = () => {
  return getAdminApp().auth();
};

export const getAdminDb = () => {
  return getAdminApp().firestore();
};
