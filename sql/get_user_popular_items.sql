-- Funktion, um die häufigsten Items eines Benutzers aus seinen abgeschlossenen Einkaufssessions abzurufen
CREATE OR REPLACE FUNCTION get_user_popular_items(user_id_param UUID, limit_param INTEGER)
RETURNS SETOF items AS $$
BEGIN
  RETURN QUERY
  SELECT i.*
  FROM items i
  JOIN shopping_session_items ssi ON i.id = ssi.item_id
  JOIN shopping_sessions ss ON ssi.session_id = ss.id
  WHERE ss.user_id = user_id_param
  GROUP BY i.id
  ORDER BY COUNT(ssi.id) DESC, i.name ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 