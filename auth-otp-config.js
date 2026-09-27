(() => {
  // Email OTPs and Studio-issued access codes are separate credentials.
  const OTP_LENGTH = 8;
  window.ATS_AUTH = Object.freeze({
    otpLength: OTP_LENGTH,
    accessCodeLength: 6,
    otpLabel: OTP_LENGTH + '-DIGIT LOGIN CODE'
  });
})();