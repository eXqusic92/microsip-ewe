"use strict";

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhone(value) {
  let digits = phoneDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    digits = `38${digits}`;
  } else if (digits.length === 13 && digits.startsWith("0380")) {
    digits = digits.slice(1);
  } else if (digits.length === 13 && digits.startsWith("3800")) {
    digits = `380${digits.slice(4)}`;
  }

  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
}

function lookupVariants(value) {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return [];
  }

  const digits = phoneDigits(normalized);
  const variants = new Set([digits, normalized]);

  if (!digits.startsWith("380")) {
    variants.add(`00${digits}`);
  }

  if (digits.length === 12 && digits.startsWith("380")) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`3800${digits.slice(3)}`);
    variants.add(`0380${digits.slice(3)}`);
  }

  return [...variants];
}

module.exports = {
  lookupVariants,
  normalizePhone,
  phoneDigits
};
