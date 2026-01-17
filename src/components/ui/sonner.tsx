import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, LogIn, LogOut, Settings, Mail, Key, Trash2, Save, RefreshCw, Crown, Heart } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={false}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// Custom toast helpers with icons
const toastSuccess = (title: string, description?: string) => {
  toast.success(title, { description, icon: <CheckCircle2 className="h-5 w-5" /> });
};

const toastError = (title: string, description?: string) => {
  toast.error(title, { description, icon: <XCircle className="h-5 w-5" /> });
};

const toastWarning = (title: string, description?: string) => {
  toast.warning(title, { description, icon: <AlertTriangle className="h-5 w-5" /> });
};

const toastInfo = (title: string, description?: string) => {
  toast.info(title, { description, icon: <Info className="h-5 w-5" /> });
};

const toastSignIn = () => {
  toast.success("Welkom terug!", { icon: <LogIn className="h-5 w-5" /> });
};

const toastSignOut = () => {
  toast.success("Tot ziens!", { icon: <LogOut className="h-5 w-5" /> });
};

const toastSaved = (item?: string) => {
  toast.success(item ? `${item} opgeslagen` : "Opgeslagen", { icon: <Save className="h-5 w-5" /> });
};

const toastDeleted = (item?: string) => {
  toast.success(item ? `${item} verwijderd` : "Verwijderd", { icon: <Trash2 className="h-5 w-5" /> });
};

const toastEmailSent = () => {
  toast.success("E-mail verzonden", { icon: <Mail className="h-5 w-5" /> });
};

const toastPasswordChanged = () => {
  toast.success("Wachtwoord gewijzigd", { icon: <Key className="h-5 w-5" /> });
};

const toastSettingsUpdated = () => {
  toast.success("Instellingen bijgewerkt", { icon: <Settings className="h-5 w-5" /> });
};

const toastRefreshed = (item?: string) => {
  toast.success(item ? `${item} vernieuwd` : "Vernieuwd", { icon: <RefreshCw className="h-5 w-5" /> });
};

const toastSubscription = (message: string) => {
  toast.success(message, { icon: <Crown className="h-5 w-5 text-yellow-500" /> });
};

const toastDonation = () => {
  toast.success("Bedankt voor uw donatie!", { icon: <Heart className="h-5 w-5 text-red-500" /> });
};

export { 
  Toaster, 
  toast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastSignIn,
  toastSignOut,
  toastSaved,
  toastDeleted,
  toastEmailSent,
  toastPasswordChanged,
  toastSettingsUpdated,
  toastRefreshed,
  toastSubscription,
  toastDonation
};
