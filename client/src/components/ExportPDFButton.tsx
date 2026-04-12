import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportPDFButtonProps {
  type: "checklist" | "workOrder";
  id: number;
  filename: string;
  onExport: (id: number) => Promise<{ filename: string; buffer: string }>;
}

export function ExportPDFButton({ type, id, filename, onExport }: ExportPDFButtonProps) {
  const handleExport = async () => {
    try {
      const result = await onExport(id);
      
      // Convert base64 to blob
      const binaryString = atob(result.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`${type === "checklist" ? "Checklist" : "Orden de trabajo"} exportada`);
    } catch (error) {
      toast.error("Error al exportar PDF");
      console.error(error);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full border-[#244b46]/15 bg-white text-[#244b46]"
      onClick={handleExport}
    >
      <Download className="mr-2 h-4 w-4" />
      Exportar PDF
    </Button>
  );
}
