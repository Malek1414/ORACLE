// AUTO-GENERATED — replace with the output of the ChatGPT PDF coordinate prompt.
// All values are pdf-lib points (origin = bottom-left of page, A4 = 595x842).
//
// Until ChatGPT fills this in, every coordinate is 0. The generator checks for
// zero coords and falls back to the supplementary page layout so the PDF still
// works while coordinates are being mapped.

export const ALLIANZ_COORDS = {
  claimantName:         { page: 0, x: 24,  y: 666, maxWidth: 240 },
  dateOfBirth:          { page: 0, x: 52,  y: 292, maxWidth: 60 },
  address:              { page: 0, x: 24,  y: 638, maxWidth: 240 },
  phone:                { page: 0, x: 24,  y: 561, maxWidth: 84 },
  email:                { page: 0, x: 24,  y: 610, maxWidth: 240 },
  policyNumber:         { page: 0, x: 92,  y: 481, maxWidth: 114 },
  insurer:              { page: 0, x: 24,  y: 501, maxWidth: 182 },
  licencePlate:         { page: 0, x: 101, y: 524, maxWidth: 105 },
  vehicleMakeModelYear: { page: 0, x: 82,  y: 543, maxWidth: 124 },
  incidentDate:         { page: 0, x: 27,  y: 765, maxWidth: 88 },
  incidentLocation:     { page: 0, x: 174, y: 765, maxWidth: 258 },
  incidentDescription:  { page: 0, x: 24,  y: 80,  maxWidth: 182, maxCharsPerLine: 42 },
  otherDriverName:      { page: 0, x: 330, y: 666, maxWidth: 240 },
  otherDriverLicence:   { page: 0, x: 439, y: 324, maxWidth: 131 },
  otherDriverPhone:     { page: 0, x: 390, y: 561, maxWidth: 86 },
  otherDriverInsurer:   { page: 0, x: 390, y: 501, maxWidth: 181 },
  otherDriverVehicle:   { page: 0, x: 448, y: 543, maxWidth: 122 },
  witnessName:          { page: 0, x: 174, y: 724, maxWidth: 170 },
  witnessPhone:         { page: 0, x: 350, y: 724, maxWidth: 88 },
  policeReportNumber:   { page: 0, x: 390, y: 80,  maxWidth: 181 },
  signatureBox:         { page: 0, x: 224, y: 36,  width: 68,  height: 43 },
  sketchBox:            { page: 0, x: 168, y: 104, width: 260, height: 116 },
} as const;


/** True once ChatGPT coordinates have been pasted in — gates page-1 overlay. */
export const COORDS_MAPPED = Object.values(ALLIANZ_COORDS).some(
  (c) => 'x' in c && c.x > 0,
);
