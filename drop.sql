DROP INDEX IF EXISTS 
  ux_historico_user_usuario,
  ux_historico_user_playlist,
  ux_historico_user_musica,
  idx_like_musica_user_date,
  idx_visualizacao_user_date,
  idx_visualizacao_musica_data;

DROP TABLE IF EXISTS
    Historico,
    Usuario_Status,
    refresh_tokens,
    Reage_Live,
    Reporte_Comentario,
    Musica_Categoria,
    Playlist_Categoria,
    Playlist_Musica,
    Utilizador_Notificacao,
    Live_Aderir,
    Segue_Utilizador,
    Like_Musica,
    Like_Playlist,
    Evento_Voto,
    Evento_Sugestao,
    Evento_Utilizador,
    Evento,
    Comentario,
    Visualizacao,
    Feature,
    Utilizador_Seleciona_Badge,
    Utilizador_Badge_Progresso,
    Utilizador_Badge,
    Doacao,
    Badge,
    Live,
    Notificacao,
    Playlist,
    Musica,
    Categoria,
    Utilizador_Settings,
    Utilizador
    CASCADE;

DROP TYPE IF EXISTS pagina_tipo;