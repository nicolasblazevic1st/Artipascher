import {
  formatNafList,
  formatNafWithLabel,
} from "@/lib/naf-trade-groups";

export function NafCodeLabel({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  if (!code) return null;
  return <span className={className}>{formatNafWithLabel(code)}</span>;
}

export function NafCodeList({
  codes,
  className,
  separator = " · ",
}: {
  codes: readonly string[];
  className?: string;
  separator?: string;
}) {
  if (codes.length === 0) return null;
  return (
    <span className={className}>{formatNafList(codes, separator)}</span>
  );
}
