import { Link } from "react-router-dom";
import logoImg from "../../assets/designdec-logo.png";
import { cn } from "../../utils/cn";

export function BrandLogo({ className, imgClassName, collapsed = false, to = "/" }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center select-none transition-opacity hover:opacity-95 focus:outline-none",
        className
      )}
      aria-label="designdec.in - Design, Decoration & Deliver"
    >
      <img
        src={logoImg}
        alt="designdec.in - Design, Decoration & Deliver"
        className={cn(
          collapsed
            ? "h-7 w-auto object-contain max-w-[36px]"
            : "h-9 sm:h-10 lg:h-11 w-auto object-contain",
          imgClassName
        )}
      />
    </Link>
  );
}

export default BrandLogo;
