import { VerificationScreen } from "@/modules/verification/verification-screen";
export default async function Verify({ searchParams }: { searchParams: Promise<{ credential?: string }> }) {
  const { credential } = await searchParams;
  return <VerificationScreen initialId={credential}/>;
}
