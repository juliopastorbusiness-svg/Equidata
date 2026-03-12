import { FirebaseError } from "firebase/app";

export const getFirebaseErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (!(error instanceof FirebaseError)) {
    return fallback;
  }

  switch (error.code) {
    case "storage/unauthorized":
      return "No tienes permisos para subir archivos a Firebase Storage.";
    case "storage/canceled":
      return "La subida del archivo se ha cancelado.";
    case "storage/quota-exceeded":
      return "Firebase Storage ha superado la cuota disponible.";
    case "storage/object-not-found":
      return "El archivo no existe en Firebase Storage.";
    case "storage/bucket-not-found":
      return "El bucket de Firebase Storage no esta configurado correctamente.";
    case "storage/project-not-found":
      return "El proyecto de Firebase Storage no esta disponible.";
    case "storage/unknown":
      return `${fallback} Revisa el bucket y las reglas de Firebase Storage.`;
    default:
      return error.message || fallback;
  }
};
