Feature: The calendar — the releases day by day, read before sign-in
  «Цього тижня» became «Календар» on 2026-10-07 (owner's design,
  design/seenit-site-pages-spec.md): a rail of a week's days with arrows to
  the weeks around it, a filter of three types (in cinemas, at home, new
  episodes), the agenda of the shelf's cards, and a film panel that every
  card opens in. The address keeps the week (w=), the types (k=) and the
  open film (f=), and /week forwards here with its old ?s= still read.
  The page reads /public/calendar and /public/film, and /public/home while
  those are not deployed: every scenario holds on either.
  Read-only (REQ T-4): nothing here writes anything.

  Scenario: The calendar has a tab of its own, from the front page and from every calm page
    Then the front page's calendar word opens the calendar with a week of days
    And the about page's calendar tab opens the calendar, lit

  Scenario: The type filter narrows the agenda, and the address keeps it
    Then switching off the cinemas leaves only the other types, and a reload keeps it

  Scenario: The week's arrow moves the rail a week on, and the address keeps it
    Then the next week's arrow moves the rail seven days on, and a reload keeps it

  Scenario: A card opens its film in the panel, and the address names it
    Then a card pressed opens its film in the panel and its key in the address, and a reload keeps it

  Scenario: The old week address leads to the calendar, keeping its section
    Then the week's old address with its section opens the calendar on that type alone

  Scenario: The panel leads a signed-in reader to the film in the app
    When I open a calendar film from the panel in the app
    Then that film's card is open in the app
