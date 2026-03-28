import { LiveMemberProfilePage } from "@/modules/people/components/live-member-profile-page"

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; userId: string }>
}) {
  const { workspaceSlug, userId } = await params

  return <LiveMemberProfilePage workspaceSlug={workspaceSlug} userId={userId} />
}
