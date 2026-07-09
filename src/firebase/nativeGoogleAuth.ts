import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseAuth, googleAuthProvider } from "./firebase";

export const signInWithGoogle = async () => {
  if (!Capacitor.isNativePlatform()) {
    await signInWithPopup(firebaseAuth, googleAuthProvider);
    return;
  }

  const result = await FirebaseAuthentication.signInWithGoogle({
    skipNativeAuth: true,
    useCredentialManager: false,
  });
  const idToken = result.credential?.idToken;

  if (!idToken) {
    throw new Error("Google did not return a sign-in token. Try again.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(firebaseAuth, credential);
};

export const signOutOfCloudAccount = async () => {
  await signOut(firebaseAuth);

  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut().catch(() => undefined);
  }
};
