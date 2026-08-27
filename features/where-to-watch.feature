Feature: "Де подивитись" — where a film can be watched
  The provider row under the trailer: which services carry this film, what
  the offer is, and a link out to the film's own page on each.

  Read-only, like the rest of the suite: this opens modals and reads them.
  It never follows a provider link — the point of these scenarios is partly
  to prove the app cannot spend money, and a CI run clicking through to a
  storefront would be a poor way to make that argument.

  Every scenario skips rather than fails when no film in the catalogue has
  providers yet. That is the ORDINARY state until the backfill has run, and
  a red smoke suite rolls the live site back to the previous release — so a
  feature that has simply not been populated must not read as a regression.

  Scenario: A film with providers lists each one with its offer
    Given a movie modal with providers is open
    Then every provider row names a service and what the offer is
    And every provider row carries the service's own logo

  Scenario: What you can already watch is listed above what you must pay for
    # Subscription first, purchase last: the first row a person reads should
    # be "this costs you nothing extra", never a storefront.
    Given a movie modal with providers is open
    Then providers are ordered from subscription to purchase

  Scenario: Provider links open the film's page in a new tab, safely
    Given a movie modal with providers is open
    Then every provider link opens in a new tab with rel="noopener"
    And every provider link points at a film page, never a checkout

  Scenario: No row names a service this region cannot use
    # Rakuten TV does not operate in Ukraine (owner's call); rows for it
    # survive in records written by earlier passes until the provider pass
    # rewrites them, and the card must hide them without waiting for that.
    Given a movie modal with providers is open
    Then no provider row names "Rakuten TV"

  Scenario: A Megogo row claims catalogue presence, never a price
    # Megogo is resolved from its sitemap, which proves the page exists and
    # says nothing about money. Labelling it "Передплата" would be a guess
    # about what somebody gets charged.
    Given a movie modal with providers is open
    Then no Megogo row claims a subscription or a price
