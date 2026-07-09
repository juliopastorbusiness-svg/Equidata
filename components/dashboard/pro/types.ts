import { ProfessionalRequestStatus } from "@/lib/services/professionalRequestService";

export type ProCenterSearchResult = {
  id: string;
  name: string;
  city?: string;
  province?: string;
  logoUrl?: string;
  profileImageUrl?: string;
  horseCount?: number;
  professionalCount?: number;
};

export type ProCenterRequestState = ProfessionalRequestStatus | "none" | "member";
