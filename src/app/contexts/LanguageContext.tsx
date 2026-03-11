import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'es';

interface Translations {
  [key: string]: { en: string; es: string };
}

const translations: Translations = {
  'auth.login': { en: 'Log In', es: 'Iniciar Sesión' },
  'auth.email': { en: 'Email', es: 'Correo Electrónico' },
  'auth.password': { en: 'Password', es: 'Contraseña' },
  'auth.tagline': { en: 'Professional Time Tracking for Painting Contractors', es: 'Seguimiento de Tiempo Profesional para Contratistas de Pintura' },
  'auth.demoCredentials': { en: 'Demo: supervisor@demo.com / painter@demo.com — demo123', es: 'Demo: supervisor@demo.com / painter@demo.com — demo123' },

  'painter.checkIn': { en: 'Check In', es: 'Registrar Entrada' },
  'painter.checkOut': { en: 'Check Out', es: 'Registrar Salida' },
  'painter.selectProject': { en: 'Select Project', es: 'Seleccionar Proyecto' },
  'painter.todayHours': { en: 'Hours Today', es: 'Horas Hoy' },
  'painter.requestProject': { en: 'Request New Project', es: 'Solicitar Nuevo Proyecto' },
  'painter.gettingLocation': { en: 'Getting GPS location...', es: 'Obteniendo ubicación GPS...' },
  'painter.outsideGeofence': { en: 'You are outside the project geofence. Move closer to check in.', es: 'Está fuera de la geocerca del proyecto. Acérquese para registrar entrada.' },
  'painter.gpsAccuracyPoor': { en: 'GPS accuracy too low. Please try again.', es: 'Precisión GPS muy baja. Intente de nuevo.' },
  'painter.checkedIn': { en: 'Checked in successfully', es: 'Entrada registrada correctamente' },
  'painter.checkedOut': { en: 'Checked out successfully', es: 'Salida registrada correctamente' },
  'painter.hoursWorked': { en: 'Hours worked', es: 'Horas trabajadas' },
  'painter.recentActivity': { en: 'Recent Activity', es: 'Actividad Reciente' },
  'painter.proposeCorrection': { en: 'Propose Correction', es: 'Proponer Corrección' },
  'painter.addMissingShift': { en: 'Add Missing Shift', es: 'Agregar Turno Faltante' },
  'painter.workNotification': { en: 'Did you forget to check in? Add missing shift or propose correction', es: '¿Olvidó registrar entrada? Agregue turno faltante o proponga corrección' },
  'painter.dismiss': { en: 'Dismiss', es: 'Descartar' },
  'painter.requestNewProject': { en: 'Request New Project', es: 'Solicitar Nuevo Proyecto' },
  'painter.projectName': { en: 'Project Name', es: 'Nombre del Proyecto' },
  'painter.address': { en: 'Address', es: 'Dirección' },
  'painter.geocode': { en: 'Geocode', es: 'Geocodificar' },
  'painter.radius': { en: 'Radius', es: 'Radio' },
  'painter.projectRequestSubmitted': { en: 'Project request submitted', es: 'Solicitud de proyecto enviada' },
  'painter.shiftCorrection': { en: 'Shift Correction', es: 'Corrección de Turno' },
  'painter.proposeCorrectionTab': { en: 'Propose Correction', es: 'Proponer Corrección' },
  'painter.addMissingShiftTab': { en: 'Add Missing Shift', es: 'Agregar Turno Faltante' },
  'painter.selectShift': { en: 'Select Shift', es: 'Seleccionar Turno' },
  'painter.checkInTime': { en: 'Check-In Time', es: 'Hora de Entrada' },
  'painter.checkOutTime': { en: 'Check-Out Time', es: 'Hora de Salida' },
  'painter.requestedTime': { en: 'Requested Time', es: 'Hora Solicitada' },
  'painter.originalTime': { en: 'Original Time', es: 'Hora Original' },
  'painter.reason': { en: 'Reason', es: 'Motivo' },
  'painter.reasonPlaceholder': { en: 'e.g., Forgot to check in, phone died...', es: 'ej., Olvidé registrar entrada, se apagó el teléfono...' },
  'painter.correctionType': { en: 'Correction Type', es: 'Tipo de Corrección' },
  'painter.correctionSubmitted': { en: 'Correction request submitted', es: 'Solicitud de corrección enviada' },
  'painter.createNewProject': { en: 'Create New Project', es: 'Crear Nuevo Proyecto' },
  'painter.completed': { en: 'Completed', es: 'Completado' },
  'painter.pending': { en: 'Pending', es: 'Pendiente' },
  'painter.welcome': { en: 'Welcome', es: 'Bienvenido' },
  'painter.addAProject': { en: 'Add a Project', es: 'Agregar un Proyecto' },
  'painter.totalToday': { en: 'Total Today', es: 'Total Hoy' },
  'painter.hours': { en: 'hours', es: 'horas' },
  'painter.projectLocation': { en: 'Project Location', es: 'Ubicación del Proyecto' },
  'painter.tapToOpenMaps': { en: 'Tap to open in maps', es: 'Toca para abrir en mapas' },
  'painter.viewCalendar': { en: 'View Calendar', es: 'Ver Calendario' },
  'painter.myCalendar': { en: 'My Calendar', es: 'Mi Calendario' },
  'painter.payPeriodSummary': { en: 'Pay Period Summary', es: 'Resumen del Período de Pago' },
  'painter.currentPeriod': { en: 'Current Period', es: 'Período Actual' },
  'painter.hoursWorkedLabel': { en: 'HOURS WORKED', es: 'HORAS TRABAJADAS' },
  'painter.estimatedPay': { en: 'ESTIMATED PAY', es: 'PAGO ESTIMADO' },
  'painter.shifts': { en: 'shifts', es: 'turnos' },
  'painter.noTimeEntries': { en: 'No time entries for this date', es: 'No hay registros de tiempo para esta fecha' },
  'painter.total': { en: 'Total', es: 'Total' },
  'painter.lastPeriod': { en: 'Last Period', es: 'Período Anterior' },
  'painter.customDates': { en: 'Custom Dates', es: 'Fechas Personalizadas' },
  'painter.startDate': { en: 'Start Date', es: 'Fecha de Inicio' },
  'painter.endDate': { en: 'End Date', es: 'Fecha de Fin' },

  'supervisor.projects': { en: 'Projects', es: 'Proyectos' },
  'supervisor.team': { en: 'Team', es: 'Equipo' },
  'supervisor.timeReview': { en: 'Time Review', es: 'Revisión de Tiempo' },
  'supervisor.payroll': { en: 'Payroll', es: 'Nómina' },
  'supervisor.queue': { en: 'Queue', es: 'Cola' },
  'supervisor.addProject': { en: 'Add Project', es: 'Agregar Proyecto' },
  'supervisor.editProject': { en: 'Edit Project', es: 'Editar Proyecto' },
  'supervisor.projectName': { en: 'Project Name', es: 'Nombre del Proyecto' },
  'supervisor.geofenceRadius': { en: 'Geofence Radius', es: 'Radio de Geocerca' },
  'supervisor.totalProjects': { en: 'Total Projects', es: 'Proyectos Totales' },
  'supervisor.crewSize': { en: 'Crew Size', es: 'Tamaño del Equipo' },
  'supervisor.totalHours': { en: 'Total Hours', es: 'Horas Totales' },
  'supervisor.totalCost': { en: 'Total Cost', es: 'Costo Total' },
  'supervisor.allProjects': { en: 'All Projects', es: 'Todos los Proyectos' },
  'supervisor.listView': { en: 'List', es: 'Lista' },
  'supervisor.mapView': { en: 'Map', es: 'Mapa' },
  'supervisor.addressOnly': { en: 'Address Only', es: 'Solo Dirección' },
  'supervisor.latLngOnly': { en: 'Latitude/Longitude Only', es: 'Solo Latitud/Longitud' },
  'supervisor.both': { en: 'Both (Address + Lat/Long)', es: 'Ambos (Dirección + Lat/Long)' },
  'supervisor.enterAddress': { en: 'Enter full address...', es: 'Ingrese dirección completa...' },
  'supervisor.geocodeHelp': { en: "Click 'Geocode' to automatically convert address to coordinates", es: "Haga clic en 'Geocodificar' para convertir la dirección en coordenadas" },
  'supervisor.latitude': { en: 'Latitude', es: 'Latitud' },
  'supervisor.longitude': { en: 'Longitude', es: 'Longitud' },
  'supervisor.additionalNotes': { en: 'Additional Notes', es: 'Notas Adicionales' },
  'supervisor.notesPlaceholder': { en: 'e.g., Access instructions, parking location, landmarks...', es: 'ej., Instrucciones de acceso, estacionamiento, puntos de referencia...' },
  'supervisor.pendingProjectRequests': { en: 'Pending Project Requests', es: 'Solicitudes de Proyecto Pendientes' },
  'supervisor.requestedBy': { en: 'Requested by', es: 'Solicitado por' },
  'supervisor.approve': { en: 'Approve', es: 'Aprobar' },
  'supervisor.deny': { en: 'Deny', es: 'Denegar' },
  'supervisor.addTeamMember': { en: 'Add Team Member', es: 'Agregar Miembro' },
  'supervisor.editMember': { en: 'Edit Member', es: 'Editar Miembro' },
  'supervisor.name': { en: 'Name', es: 'Nombre' },
  'supervisor.email': { en: 'Email', es: 'Correo' },
  'supervisor.password': { en: 'Password', es: 'Contraseña' },
  'supervisor.role': { en: 'Role', es: 'Rol' },
  'supervisor.painter': { en: 'Painter', es: 'Pintor' },
  'supervisor.supervisor': { en: 'Supervisor', es: 'Supervisor' },
  'supervisor.hourlyRate': { en: 'Hourly Rate', es: 'Tarifa por Hora' },
  'supervisor.language': { en: 'Language', es: 'Idioma' },
  'supervisor.english': { en: 'English', es: 'Inglés' },
  'supervisor.spanish': { en: 'Spanish', es: 'Español' },
  'supervisor.crewSummary': { en: 'Crew Summary', es: 'Resumen del Equipo' },
  'supervisor.totalPainters': { en: 'Total Painters', es: 'Pintores Totales' },
  'supervisor.avgHourlyRate': { en: 'Average Hourly Rate', es: 'Tarifa Promedio por Hora' },
  'supervisor.activeToday': { en: 'Active Today', es: 'Activos Hoy' },
  'supervisor.dateRange': { en: 'Date Range', es: 'Rango de Fechas' },
  'supervisor.from': { en: 'From', es: 'Desde' },
  'supervisor.to': { en: 'To', es: 'Hasta' },
  'supervisor.calculate': { en: 'Calculate', es: 'Calcular' },
  'supervisor.exportPDF': { en: 'Export to PDF', es: 'Exportar a PDF' },
  'supervisor.thisWeek': { en: 'This Week', es: 'Esta Semana' },
  'supervisor.lastWeek': { en: 'Last Week', es: 'Semana Pasada' },
  'supervisor.thisMonth': { en: 'This Month', es: 'Este Mes' },
  'supervisor.lastMonth': { en: 'Last Month', es: 'Mes Pasado' },
  'supervisor.painterName': { en: 'Painter Name', es: 'Nombre del Pintor' },
  'supervisor.hours': { en: 'Hours', es: 'Horas' },
  'supervisor.rate': { en: 'Rate', es: 'Tarifa' },
  'supervisor.cost': { en: 'Cost', es: 'Costo' },
  'supervisor.projectsWorked': { en: 'Projects Worked', es: 'Proyectos Trabajados' },
  'supervisor.grandTotal': { en: 'Grand Total', es: 'Total General' },
  'supervisor.pendingCorrections': { en: 'Pending Corrections', es: 'Correcciones Pendientes' },
  'supervisor.reviewCorrections': { en: 'Review Corrections', es: 'Revisar Correcciones' },
  'supervisor.newShift': { en: 'NEW SHIFT', es: 'NUEVO TURNO' },
  'supervisor.newProject': { en: 'NEW PROJECT', es: 'NUEVO PROYECTO' },
  'supervisor.denialReason': { en: 'Reason for denial', es: 'Motivo de denegación' },
  'supervisor.correctionApproved': { en: 'Correction approved', es: 'Corrección aprobada' },
  'supervisor.correctionDenied': { en: 'Correction denied', es: 'Corrección denegada' },
  'supervisor.needsReview': { en: 'Needs Review', es: 'Requiere Revisión' },
  'supervisor.corrected': { en: 'Corrected', es: 'Corregido' },
  'supervisor.totalEntries': { en: 'Total Entries', es: 'Entradas Totales' },
  'supervisor.correctionsPending': { en: 'Corrections Pending', es: 'Correcciones Pendientes' },
  'supervisor.review': { en: 'Review', es: 'Revisar' },
  'supervisor.enterProjectName': { en: 'Enter project name', es: 'Ingrese nombre del proyecto' },

  'common.save': { en: 'Save', es: 'Guardar' },
  'common.cancel': { en: 'Cancel', es: 'Cancelar' },
  'common.delete': { en: 'Delete', es: 'Eliminar' },
  'common.edit': { en: 'Edit', es: 'Editar' },
  'common.approve': { en: 'Approve', es: 'Aprobar' },
  'common.deny': { en: 'Deny', es: 'Denegar' },
  'common.submit': { en: 'Submit', es: 'Enviar' },
  'common.logout': { en: 'Logout', es: 'Cerrar Sesión' },
  'common.appName': { en: 'aime Tempo', es: 'aime Tempo' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
