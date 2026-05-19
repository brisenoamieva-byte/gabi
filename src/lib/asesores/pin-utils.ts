export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

export const generatePin = () =>
  String(Math.floor(1000 + Math.random() * 9000));
