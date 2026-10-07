Feature: The site — the pages read before sign-in
  The front page tells what the app does in scenes under its own glass header
  (owner's designs, 2026-10-05 and 2026-10-06); every other page wears one calm
  frame with five tabs (design/site-pages), folded behind a menu key on a
  phone (2026-10-07). The stories are a list and a panel since 2026-10-07: a
  row opens its story beside the list, and the address follows. The calendar,
  which took the week's place, has a feature of its own (calendar.feature).
  Read-only (REQ T-4): nothing here writes anything.

  Scenario: A fresh visitor at the root meets the front page
    Then a fresh visitor at the root meets the front page
    And the front page offers a stranger a way in and an account

  Scenario: The rating scene answers a hand
    Then the rating scene answers a hand on its tape

  Scenario: The projector scene plays through on the scroll
    Then the projector scene plays through on the scroll alone

  @phone-portrait
  Scenario: On a phone the projector stands inside its scene
    Then the projector stands inside its scene on a phone

  @phone-portrait
  Scenario: On a phone the site's tabs fold behind a menu key
    Then the site's tabs stand behind the menu key, and a tab leads to its page

  Scenario: Every page of the site carries its tabs and TMDB's notice
    Then every page of the site shows the tab strip and TMDB's notice

  Scenario: Each document has its own address and the section's menu
    Then each document opens at its own address with the section's menu

  Scenario: The word in the app's header leads to the front page, signed in
    When I press the word in the app's header
    Then the front page offers the way back into the app
    And I am still signed in

  Scenario: Stories name their sources and credit their photos
    Then the stories page shows sourced stories with credited photos
    And a row of the list opens its story in the panel, and the address follows

  Scenario: A story's trailer asks YouTube nothing until it is tapped
    Then a trailer loads only when it is tapped, from the no-cookie player

  Scenario: The front page leads to the newest story
    Then the front page leads to the newest stories
