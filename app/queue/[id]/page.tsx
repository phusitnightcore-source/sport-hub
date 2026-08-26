import { redirect } from "next/navigation";

export default function PublicQueueRedirect() {
  redirect("/badminton-group/dashboard");
}
