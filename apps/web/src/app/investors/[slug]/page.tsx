import { InvestorDetailPage } from "@/features/investors/components/investor-detail-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InvestorDetail({ params }: PageProps) {
  const { slug } = await params;
  return <InvestorDetailPage slug={slug} />;
}
