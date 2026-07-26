import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  OAuthProvider,
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

export const signInWithApple = async () => {
  if (!Capacitor.isNativePlatform()) {
    const provider = new OAuthProvider("apple.com");
    await signInWithPopup(firebaseAuth, provider);
    return;
  }

  const result = await FirebaseAuthentication.signInWithApple({
    skipNativeAuth: true,
  });
  const idToken = result.credential?.idToken;
  const rawNonce = result.credential?.nonce;

  if (!idToken || !rawNonce) {
    throw new Error("Apple did not return the information needed to sign in. Try again.");
  }

  const credential = new OAuthProvider("apple.com").credential({ idToken, rawNonce });
  await signInWithCredential(firebaseAuth, credential);
};

export const signOutOfCloudAccount = async () => {
  await signOut(firebaseAuth);

  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut().catch(() => undefined);
  }
};
