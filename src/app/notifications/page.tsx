import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationsPageClient } from "@/components/notifications-page-client";

export const metadata = {
  title: "Bildirimler | ISGOne AI",
};

export default function NotificationsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Bildirim Merkezi</CardTitle>
          <CardDescription>Yaklaşan randevular, gecikenler ve sistem uyarıları</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsPageClient />
        </CardContent>
      </Card>
    </div>
  );
}
