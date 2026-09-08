import { CredentialDetail } from "@/modules/credentials/detail-screen";
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CredentialDetail id={id}/>;
}
