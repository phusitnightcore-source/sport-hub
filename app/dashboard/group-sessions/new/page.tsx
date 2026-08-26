import { redirect } from "next/navigation";

export default function NewGroupSessionRedirect() {
  redirect("/badminton-group/dashboard/admin");
}
