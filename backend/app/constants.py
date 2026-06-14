DESTINATIONS = [
    "Caribbean",
    "Alaska",
    "New England/Canada",
    "Panama Canal",
    "South America",
    "Mexican Riviera",
    "Transatlantic",
    "Transpacific",
    "Hawaii",
    "Asia",
    "Australia",
    "Europe",
    "Galapagos",
    "Antarctica",
]

CABIN_TYPES = ["Interior", "Ocean View", "Balcony", "Suite"]

QUALIFIERS = ["Military", "Educator", "First Responder", "55+ (Senior)"]

CARIBBEAN_REGIONS = ["Eastern", "Western", "Southern", "South Eastern"]

ALASKA_OPTIONS = [
    "RT Seattle",
    "RT Vancouver",
    "Northern One Way",
    "Southern One Way",
    "Cruise tour",
]

ASIA_OPTIONS = ["Japan", "SE Asia", "French Polynesia"]

EUROPE_REGIONS = [
    "Eastern Med - Greece",
    "Eastern Med - Adriatic",
    "Western Med",
    "Northern - UK",
    "Northern Norway",
    "Northern Baltic",
    "Northern Iceland/Greenland",
]

US_STATES = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "District of Columbia",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
]

CANADIAN_PROVINCES = [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Northwest Territories",
    "Nova Scotia",
    "Nunavut",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Yukon",
]

RESIDENCY_REGIONS = US_STATES + CANADIAN_PROVINCES

REQUEST_STATUS_OPEN = "Open"
REQUEST_STATUS_CLOSED = "Closed"
REQUEST_STATUSES = [REQUEST_STATUS_OPEN, REQUEST_STATUS_CLOSED]

CLOSE_REASONS = [
    "Purchased - Trip Created",
    "Cost - Went with Competitor",
    "Communication - Went with Competitor",
    "Changed Vacation Plans",
    "General Inquiry - Fishing",
]

STALE_DAYS = 3

PROPOSED_CRUISE_STATUS_PROPOSED = "Proposed"
PROPOSED_CRUISE_STATUS_ACCEPTED = "Accepted"
PROPOSED_CRUISE_STATUS_REJECTED = "Rejected"
PROPOSED_CRUISE_STATUSES = [
    PROPOSED_CRUISE_STATUS_PROPOSED,
    PROPOSED_CRUISE_STATUS_ACCEPTED,
    PROPOSED_CRUISE_STATUS_REJECTED,
]

QUOTED_INSURANCE_STATUS_PROPOSED = "Proposed"
QUOTED_INSURANCE_STATUS_DECLINED = "Declined"
QUOTED_INSURANCE_STATUS_ACCEPTED = "Accepted"
QUOTED_INSURANCE_STATUSES = [
    QUOTED_INSURANCE_STATUS_PROPOSED,
    QUOTED_INSURANCE_STATUS_DECLINED,
    QUOTED_INSURANCE_STATUS_ACCEPTED,
]
