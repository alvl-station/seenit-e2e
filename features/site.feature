Feature: The site — the pages read before sign-in
  The front page tells what the app does in scenes under its own glass header
  (owner's designs, 2026-10-05 and 2026-10-06); this week's news is a tab of its
  own, one strip of posters in the same dark frame, whose cards open the film in
  the app. Every other page of the site wears the app's own header and tab strip.
  Read-only (REQ T-4): nothing here writes anything.

  Scenario: A fresh visitor at the root meets the front page
    Then a fresh visitor at the root meets the front page
    And the front page offers a stranger a way in and an account

  Scenario: This week's news has a tab of its own
    Then the week's tab shows this week's news

  Scenario: The rating scene answers a hand
    Then the rating scene answers a hand on its tape

  Scenario: The projector scene plays through on the scroll
    Then the projector scene plays through on the scroll alone

  Scenario: Every page of the site carries its tabs and TMDB's notice
    Then every page of the site shows the tab strip and TMDB's notice

  Scenario: Each document has its own address and the section's menu
    Then each document opens at its own address with the section's menu

  Scenario: The word in the app's header leads to the front page, signed in
    When I press the word in the app's header
    Then the front page offers the way back into the app
    And I am still signed in

  Scenario: A card of the week opens that film in the app
    When I open the first film on the week's tab
    Then that film's card is open in the app

  Scenario: Stories name their sources and credit their photos
    Then the stories page shows sourced stories with credited photos

  Scenario: A story's trailer asks YouTube nothing until it is tapped
    Then a trailer loads only when it is tapped, from the no-cookie player

  Scenario: The front page leads to the newest story
    Then the front page leads to the newest stories
