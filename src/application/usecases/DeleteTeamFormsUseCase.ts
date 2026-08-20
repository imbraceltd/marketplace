import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import { getTeamsByOrgId, getUserInfo } from '../../core/repositories/team_users';
import { handleServiceError } from '../../utils/error';

export class DeleteTeamFormsUseCase {
    constructor(private repository: IFormRepository) { }

    async execute(teamId: string) {
        try {
            // 1. Find all forms that have this team
            const forms = await this.repository.findByTeamId(teamId);
            if (forms.length === 0) return [];

            const formIds = forms.map(f => f.id);

            // 2. Process each form
            const updatePromises = forms.map(async (form) => {
                let updatedTeams = (form.teams || []).filter((t: any) => t.team_id !== teamId);

                // If no teams left, change to General team of the organization
                if (updatedTeams.length === 0) {
                    const allOrgTeams = await getTeamsByOrgId(form.organization_id);
                    const generalTeam = allOrgTeams.find((t) => t.name.toLowerCase() === 'general');

                    if (generalTeam) {
                        updatedTeams = [{
                            team_id: generalTeam.id,
                            team_name: generalTeam.name
                        }];
                    }
                }

                // Check if owner is still in any of the teams
                let updatedOwner = form.owner;
                if (updatedOwner && updatedOwner.user_id) {
                    const ownerInfo = await getUserInfo(form.organization_id, updatedOwner.user_id);
                    if (!ownerInfo) {
                        updatedOwner = undefined;
                    } else {
                        const isUserInAnyTeam = updatedTeams.some((t: any) =>
                            ownerInfo.team && ownerInfo.team.some((ot: any) => ot.team_id === t.team_id)
                        );
                        if (!isUserInAnyTeam) {
                            updatedOwner = undefined;
                        }
                    }
                }

                // Update the form
                await this.repository.update(form.id, {
                    teams: updatedTeams,
                    owner: updatedOwner
                });
            });

            await Promise.all(updatePromises);

            return formIds;
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
