import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Log in · Saajha",
};

// Demo accounts from the seed data (password Demo@1234). Wired up once auth lands.
const demoAccounts = [
  { label: "Student", email: "student@saajha.demo" },
  { label: "Student 2", email: "student2@saajha.demo" },
  { label: "Partner", email: "partner@saajha.demo" },
  { label: "Owner", email: "owner@saajha.demo" },
  { label: "Manager", email: "manager@saajha.demo" },
  { label: "Admin", email: "admin@saajha.demo" },
];

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Log in to Saajha</CardTitle>
          <CardDescription>
            Pick a demo account to explore as that role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {demoAccounts.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                size="lg"
                type="button"
                title={account.email}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
