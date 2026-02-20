import { ApplicantForm } from "@/components/applicants/applicant-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UI } from "@/constants/ui";

export const metadata = {
  title: "Postula a Fundación RASMA",
  description: "Completa el formulario para enviar tu postulación a Fundación RASMA.",
};

export default function PostularPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">{UI.applicantForm.title}</CardTitle>
        <p className="text-center text-sm text-muted-foreground mt-1">
          {UI.applicantForm.subtitle}
        </p>
      </CardHeader>
      <CardContent>
        <ApplicantForm />
      </CardContent>
    </Card>
  );
}
