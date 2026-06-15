import { getDocuments } from "../services/api";
import useSWR from "swr";

export default function useDocuments() {
  const { data, error, isLoading, mutate } = useSWR(
    "documents",
    async () => {
      const res = await getDocuments();
      return res.data;
    },
    {
      refreshInterval: (latestDocs) =>
        latestDocs?.some((doc) => doc.status === "processing") ? 1500 : 0
    }
  );

  return { docs: data || [], loading: isLoading, error, refresh: mutate };
}
