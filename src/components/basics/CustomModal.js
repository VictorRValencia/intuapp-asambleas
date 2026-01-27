import React from "react";
import { Check, ArrowRight } from "lucide-react";
import Button from "@/components/basics/Button";

const CustomModal = ({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  type = "confirm", // 'confirm' or 'success'
  icon: Icon,
  confirmButtonVariant = "primary",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] p-10 max-w-lg w-full relative animate-in zoom-in duration-300 shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center text-center">
          {type === "success" && (
            <div className="w-20 h-20 bg-[#F0F2FF] rounded-[24px] flex items-center justify-center text-[#94A2FF] mb-8 relative">
              <div className="absolute inset-0 bg-[#94A2FF]/5 rounded-[24px]"></div>
              <div className="w-14 h-14 rounded-full border-4 border-[#94A2FF] flex items-center justify-center bg-white shadow-sm z-10">
                <Check size={32} strokeWidth={4} />
              </div>
            </div>
          )}

          <h3 className="text-[32px] font-bold text-[#0E3C42] mb-4 leading-tight tracking-tight">
            {title}
          </h3>

          <div className="w-full border-t border-dashed border-gray-100 my-4"></div>

          <p className="text-gray-400 text-[15px] font-medium leading-relaxed mb-10 max-w-sm">
            {description}
          </p>

          <div className="w-full flex flex-col md:flex-row gap-3">
            {type === "confirm" ? (
              <>
                <Button
                  variant="secondary"
                  size="L"
                  className="flex-1"
                  onClick={onClose}
                >
                  {cancelText || "Cancelar"}
                </Button>
                <Button
                  variant={confirmButtonVariant}
                  size="L"
                  className="flex-1 text-black"
                  onClick={onConfirm}
                >
                  {confirmText}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="L"
                className="w-full text-black"
                onClick={onConfirm}
              >
                <div className="flex items-center justify-center gap-3">
                  {confirmText || "Aceptar"}
                  <ArrowRight size={22} strokeWidth={2.5} />
                </div>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
