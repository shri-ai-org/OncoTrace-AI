/* Organisation details shown in more than one place (navbar, contact
   section, footer). One source, so they can't drift apart. */

export const EMAIL = "info@oncotraceai.org";
export const PHONE = { display: "+1 408.850.2243", href: "tel:+14088502243" };
export const TEAM_URL = "https://shri-ai.org/team/";

const mapsSearch = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const OFFICES = [
  {
    region: "India",
    name: "Visolve",
    address: "Olymbus, Rukmani Nagar, Ramanathapuram, Coimbatore, Tamil Nadu 641045",
    mapUrl: mapsSearch("Visolve, Ramanathapuram, Coimbatore, Tamil Nadu 641045"),
  },
  {
    region: "United States",
    name: "Visolve",
    address: "6559 Springpath lane, San Jose, California",
    mapUrl: mapsSearch("6559 Springpath Lane, San Jose, California"),
  },
];
