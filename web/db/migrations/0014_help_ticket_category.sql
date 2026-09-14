-- 0014_help_ticket_category.sql — distinguish help/access tickets from
-- feature requests, bug reports, and general feedback raised via the
-- new "Feature request" entry in the user dropdown.
ALTER TABLE help_tickets ADD COLUMN category TEXT NOT NULL DEFAULT 'help';
