import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { generateICS, type CalendarEvent } from '../lib/icsGenerator.js';

export async function calendarRoutes(fastify: FastifyInstance) {
  // GET /calendar/:token.ics
  // Public endpoint — secured by random token in URL.
  // Calendar apps cannot send auth headers, so the token in the URL is the
  // security mechanism. Per-IP 60/hour: calendar apps poll at most every few
  // minutes; token-guessing trips the limit fast.
  fastify.get<{ Params: { token: string } }>('/calendar/:token.ics', {
    config: { rateLimit: { max: 60, timeWindow: 3600000 } },
  }, async (request, reply) => {
    const { token } = request.params;

    // Find business by calendar token
    const business = await prisma.business.findUnique({
      where: { calendarToken: token },
      select: {
        id: true,
        name: true,
        mode: true,
        calendarToken: true,
      },
    });

    if (!business) {
      return reply.status(404).send('Calendar not found');
    }

    const now = new Date();
    const events: CalendarEvent[] = [];

    // Date range: 30 days back to 90 days forward
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 30);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + 90);

    // 1. APPOINTMENTS (if business has SERVICES mode)
    if (business.mode === 'SERVICES') {
      const appointments = await prisma.appointment.findMany({
        where: {
          businessId: business.id,
          startTime: { gte: rangeStart, lte: rangeEnd },
          status: { notIn: ['CANCELLED'] },
          deletedAt: null,
        },
        include: {
          customer: { select: { name: true, phone: true } },
          service: { select: { name: true, durationMinutes: true } },
          staff: { select: { name: true } },
        },
      });

      for (const appt of appointments) {
        const start = new Date(appt.startTime);
        // endTime is a required, stored field on Appointment — use it directly
        const end = new Date(appt.endTime);
        const parts = [
          appt.customer?.phone ? `Phone: ${appt.customer.phone}` : null,
          appt.staff?.name ? `Staff: ${appt.staff.name}` : null,
          appt.notes ? `Notes: ${appt.notes}` : null,
        ].filter(Boolean);

        events.push({
          uid: `appt-${appt.id}@uzbekcrm`,
          title: `${appt.service?.name || 'Appointment'} — ${appt.customer?.name || 'Customer'}`,
          description: parts.join('\n'),
          start,
          end,
          reminderMinutes: 60,
        });
      }
    }

    // 2. ORDER DELIVERY DATES (PRODUCTS dormant — never true now)
    if (business.mode === 'PRODUCTS') {
      const orders = await prisma.order.findMany({
        where: {
          businessId: business.id,
          deliveryDate: { gte: rangeStart, lte: rangeEnd },
          orderStatus: { notIn: ['CANCELLED', 'DELIVERED'] },
          deletedAt: null,
        },
        include: {
          customer: { select: { name: true, phone: true } },
        },
      });

      for (const order of orders) {
        if (!order.deliveryDate) continue;
        const start = new Date(order.deliveryDate);
        // All-day-ish: 1 hour block at the delivery time
        const end = new Date(start.getTime() + 60 * 60000);
        const parts = [
          `Order #${order.orderNumber}`,
          order.customer?.phone ? `Phone: ${order.customer.phone}` : null,
          order.deliveryAddress ? `Address: ${order.deliveryAddress}` : null,
        ].filter(Boolean);

        events.push({
          uid: `order-${order.id}@uzbekcrm`,
          title: `Deliver order #${order.orderNumber} — ${order.customer?.name || 'Customer'}`,
          description: parts.join('\n'),
          start,
          end,
          reminderMinutes: 120,
        });
      }
    }

    // 3. MILESTONE DUE DATES + PROJECT DEADLINES (if business has FREELANCE mode)
    if (business.mode === 'FREELANCE') {
      const projects = await prisma.project.findMany({
        where: {
          businessId: business.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          deletedAt: null,
        },
        include: {
          customer: { select: { name: true } },
          milestones: { where: { deletedAt: null } },
        },
      });

      for (const project of projects) {
        // Project deadline
        if (project.deadline) {
          const deadline = new Date(project.deadline);
          if (deadline >= rangeStart && deadline <= rangeEnd) {
            const start = new Date(deadline);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start.getTime() + 60 * 60000);
            events.push({
              uid: `project-${project.id}@uzbekcrm`,
              title: `Deadline: ${project.name} — ${project.customer?.name || 'Client'}`,
              description: `Project deadline`,
              start,
              end,
              reminderMinutes: 1440, // 1 day before
            });
          }
        }

        // Milestone due dates
        for (const milestone of project.milestones) {
          if (!milestone.dueDate) continue;
          const due = new Date(milestone.dueDate);
          if (due < rangeStart || due > rangeEnd) continue;
          const start = new Date(due);
          start.setHours(9, 0, 0, 0);
          const end = new Date(start.getTime() + 60 * 60000);
          events.push({
            uid: `milestone-${milestone.id}@uzbekcrm`,
            title: `Milestone: ${milestone.name} — ${project.name}`,
            description: `Project: ${project.name}\nClient: ${project.customer?.name || ''}`,
            start,
            end,
            reminderMinutes: 1440,
          });
        }
      }
    }

    const ics = generateICS(business.name, events);

    reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .header('Content-Disposition', 'inline; filename="dealio.ics"')
      .header('Cache-Control', 'no-cache, max-age=0')
      .send(ics);
  });
}
