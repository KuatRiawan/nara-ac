import { useState, useEffect } from 'react';
import api from '../api';

let cachedProfile = null;
let fetchPromise = null;

/**
 * Normalize Indonesian phone number to WhatsApp international format (62...).
 * Handles: 0812... -> 62812..., +62 812... -> 62812..., 62812... -> 62812...
 */
export function normalizeWhatsAppNumber(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('62')) { /* already international */ }
  else if (digits.length >= 9) digits = '62' + digits;
  return digits;
}

/**
 * Hook that fetches the business profile and returns a normalized WhatsApp number.
 * Falls back to a default number if the API is unavailable.
 */
export function useBusinessProfile() {
  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);

  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = api.get('/settings/business-profile')
        .then(data => {
          cachedProfile = data;
          return data;
        })
        .catch(() => {
          cachedProfile = { phone: '0812-3456-7890' };
          return cachedProfile;
        })
        .finally(() => {
          fetchPromise = null;
        });
    }

    fetchPromise.then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

  const whatsappNumber = profile?.phone ? normalizeWhatsAppNumber(profile.phone) : '';

  return { profile, whatsappNumber, loading };
}

/**
 * Build a WhatsApp URL with optional pre-filled message.
 */
export function buildWhatsAppUrl(whatsappNumber, message) {
  const base = `https://wa.me/${whatsappNumber}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

export default useBusinessProfile;
