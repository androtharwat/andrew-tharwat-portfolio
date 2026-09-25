(() => {
  const OTP_LENGTH = 6;
  window.ATS_AUTH = Object.freeze({
    otpLength: OTP_LENGTH,
    accessCodeLength: OTP_LENGTH,
    otpLabel: OTP_LENGTH + '-DIGIT LOGIN CODE'
  });
})();