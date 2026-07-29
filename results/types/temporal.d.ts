/**
 * Temporal is ES2026 (Chrome 144+ / Firefox 139+ / Edge 144+), but
 * TypeScript's lib doesn't declare it yet — this declares just the surface
 * used in `app/utils.ts` (`relativeToNow`). Delete once `lib` catches up.
 */
declare namespace Temporal {
  interface Duration {
    years: number;
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }

  interface ZonedDateTime {
    until(other: ZonedDateTime, options: { largestUnit: "year" }): Duration;
  }

  interface Instant {
    toZonedDateTimeISO(timeZone: string): ZonedDateTime;
  }

  const Instant: {
    from(iso: string): Instant;
  };

  const Now: {
    timeZoneId(): string;
    zonedDateTimeISO(): ZonedDateTime;
  };
}
