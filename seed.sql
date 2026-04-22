-- =============================================================
-- SCRIPT DE POBLAMIENTO INICIAL (SEED)
-- Eventos Estratégicos B2B
-- =============================================================

INSERT INTO eventos_agenda (nombre, descripcion, fecha_inicio, fecha_fin, ciudad, pais, tema, lat, lng, fuente_url)
VALUES 
('PDAC 2027', 'La principal convención de exploración minera del mundo.', '2027-03-07', '2027-03-10', 'Toronto', 'Canadá', 'Minería', 43.6532, -79.3832, 'https://www.pdac.ca'),
('Expomin 2026', 'La mayor feria minera de Latinoamérica, exhibiendo tecnología e innovación.', '2026-04-20', '2026-04-23', 'Santiago', 'Chile', 'Minería', -33.4489, -70.6693, 'https://www.expomin.cl'),
('ADIPEC 2026', 'Abu Dhabi International Petroleum Exhibition and Conference.', '2026-11-09', '2026-11-12', 'Abu Dhabi', 'Emiratos Árabes', 'Energía', 24.4539, 54.3773, 'https://www.adipec.com'),
('Foro Económico Mundial', 'Reunión anual de líderes globales para discutir agendas corporativas y gubernamentales.', '2027-01-19', '2027-01-23', 'Davos', 'Suiza', 'Finanzas', 46.8027, 9.8359, 'https://www.weforum.org'),
('Smart City Expo', 'Evento mundial sobre innovación y transformación urbana.', '2026-11-03', '2026-11-05', 'Barcelona', 'España', 'Innovación', 41.3851, 2.1734, 'https://www.smartcityexpo.com');
