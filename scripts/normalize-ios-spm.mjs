import { lstat, mkdir, readFile, readlink, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageSwiftPath = path.join(projectRoot, "ios", "App", "CapApp-SPM", "Package.swift");
const symlinkDirectory = path.join(projectRoot, "ios", "App", "CapApp-SPM", "symlinks");
const authenticationLink = path.join(symlinkDirectory, "CapacitorFirebaseAuthentication");
const authenticationPackage = path.join(
  projectRoot,
  "node_modules",
  "@capacitor-firebase",
  "authentication"
);

const packageStats = await lstat(authenticationPackage).catch(() => null);
if (!packageStats?.isDirectory()) {
  throw new Error("Install dependencies before normalizing the iOS Swift package paths.");
}

const packageSwift = await readFile(packageSwiftPath, "utf8");
const normalizedPackageSwift = packageSwift.replace(/path: "([^"]+)"/g, (_match, packagePath) => {
  return `path: "${packagePath.replaceAll("\\", "/")}"`;
});

if (normalizedPackageSwift !== packageSwift) {
  await writeFile(packageSwiftPath, normalizedPackageSwift, "utf8");
}

await mkdir(symlinkDirectory, { recursive: true });
const relativeTarget = path.relative(symlinkDirectory, authenticationPackage).replaceAll(path.sep, "/");
const linkStats = await lstat(authenticationLink).catch(() => null);

if (linkStats?.isSymbolicLink()) {
  const existingTarget = (await readlink(authenticationLink)).replaceAll("\\", "/");
  if (existingTarget === relativeTarget) process.exit(0);
  await unlink(authenticationLink);
} else if (linkStats?.isFile()) {
  const existingTarget = (await readFile(authenticationLink, "utf8")).trim().replaceAll("\\", "/");
  if (existingTarget === relativeTarget) process.exit(0);
  await unlink(authenticationLink);
} else if (linkStats) {
  throw new Error(`Expected ${authenticationLink} to be a symbolic link.`);
}

try {
  await symlink(relativeTarget, authenticationLink, "dir");
} catch (error) {
  if (error?.code !== "EPERM") throw error;
  // Git checks out symlinks as text files when Windows symlink support is disabled.
  // Keeping the relative target as the file contents preserves a portable symlink in Git.
  await writeFile(authenticationLink, relativeTarget, "utf8");
}
