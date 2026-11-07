import axios from 'axios'; //importing
import { CreateUserDto } from './CreateUserDto';
import { USER_API_URL } from '../apiconfig';    

//We are using AXIOS LIBRARY TO CALL BACKEND SERVICES

export class UserService {
  
  static async createUser(createUserDto: CreateUserDto) {

    try {
      const response = await axios.post(USER_API_URL, createUserDto, {
        timeout: 15_000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  static async getAllUsers() {
    try {
      const response = await axios.get(USER_API_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async getUserById(id: string) {
    try {
      const response = await axios.get(`${USER_API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  //TODO: Change based on how id is expected by backend in url or body as part of sent json
  static async updateUser(id: string, updateUserDto: Partial<CreateUserDto>) {
    try {
      const response = await axios.patch(`${USER_API_URL}/${id}`, updateUserDto);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}
