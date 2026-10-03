import { PersonPage } from "@/domains/people/components/person-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PersonPage id={id} />
}
