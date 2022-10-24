export function parseName(name: string): [string, string] {
  const nameParts = name.trim().split(".");
  if (nameParts.length !== 2) {
    throw Error(
      "invalid, expected a second-level domain of the form `example.hh`"
    );
  }

  if (nameParts[0].length === 0) {
    throw Error(
      "invalid, expected a second-level domain of the form `example.hh`"
    );
  }

  return nameParts;
}

// export function domainPriceUsd(domain: string): number {
//   const nameParts = domain.split(".");
//   if (nameParts.length !== 2) return Number("inf");
//
//   const name = nameParts[0];
//   if (name.length === 0) return Number("inf");
//
//   let price: number;
//   let hasEmoji = false;
//
//   if (/\p{Extended_Pictographic}/u.test(name)) {
//     hasEmoji = true;
//   }
//
//   switch (name.length) {
//     case 1:
//       price = 500;
//       break;
//
//     case 2:
//       price = hasEmoji ? 1000 : 50;
//       break;
//
//     case 3:
//       price = hasEmoji ? 100 : 5;
//       break;
//
//     default:
//       price = hasEmoji ? 50 : 5;
//   }
//
//   return price;
// }
